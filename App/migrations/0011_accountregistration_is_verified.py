from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("App", "0010_alter_product_category_db_driven"),
    ]

    operations = [
        migrations.AddField(
            model_name="accountregistration",
            name="is_verified",
            field=models.BooleanField(default=False),
        ),
    ]
